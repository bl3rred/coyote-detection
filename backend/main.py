"""
YOLOv8 Detection API Backend
File: backend/main.py

Requirements (requirements.txt):
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6
pillow==10.1.0
ultralytics==8.0.230
torch>=2.0.0
numpy==1.24.3
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from ultralytics import YOLO
from PIL import Image
import io
import logging
import torch
from datetime import datetime
import cv2
import numpy as np
import base64

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="YOLOv8 Detection API", version="1.0.0")

# CORS middleware for frontend access - UPDATED
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],  # Expose all headers to frontend
)

# Global model instance
model = None
device = None

@app.on_event("startup")
async def load_model():
    """Load YOLOv8 model on startup"""
    global model, device
    try:
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        logger.info(f"Loading model on device: {device}")
        
        # Try different model paths
        try:
            model = YOLO('best.pt')
            logger.info("Loaded custom model: best.pt")
        except Exception as e:
            logger.warning(f"Could not load best.pt: {e}. Using yolov8n.pt")
            model = YOLO('yolov8n.pt')
            logger.info("Loaded pretrained model: yolov8n.pt")
            
        model.to(device)
        logger.info("Model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load model: {str(e)}")
        raise

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "model": "YOLOv8",
        "device": device,
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "POST /detect": "Detect objects in image",
            "POST /detect-json": "Detect objects with JSON response",
            "GET /health": "Detailed health check"
        }
    }

@app.post("/detect")
async def detect_objects(
    file: UploadFile = File(...),
    confidence: float = Query(0.25, ge=0.0, le=1.0, description="Confidence threshold")
):
    """
    Detect objects in uploaded image
    
    Args:
        file: Image file (JPEG, PNG)
        confidence: Detection confidence threshold (0.0-1.0)
    
    Returns:
        Annotated image with bounding boxes
    """
    start_time = datetime.now()
    
    try:
        # Validate file type
        if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
            raise HTTPException(400, "Invalid file type. Use JPEG or PNG")
        
        # Read and process image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Run inference
        logger.info(f"Running detection on {file.filename}")
        results = model.predict(
            source=image,
            conf=confidence,
            device=device,
            verbose=False
        )
        
        # Check if objects were detected
        boxes = results[0].boxes
        detection_count = 0
        max_confidence = 0.0
        detections_list = []
        
        if boxes is not None and len(boxes) > 0:
            detection_count = len(boxes)
            confidences = boxes.conf.cpu().numpy()
            classes = boxes.cls.cpu().numpy()
            names = results[0].names
            
            # Create detections list
            for i in range(len(boxes)):
                box = boxes.xyxy[i].cpu().numpy()
                detections_list.append({
                    "class": names[int(classes[i])],
                    "confidence": float(confidences[i]),
                    "bbox": box.tolist()
                })
            
            max_confidence = float(confidences.max()) if len(confidences) > 0 else 0.0
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Create headers
        headers = {
            "X-Objects-Found": str(detection_count > 0).lower(),
            "X-Detections": str(detection_count),
            "X-Confidence-Score": f"{max_confidence:.3f}",
            "X-Processing-Time": f"{processing_time:.3f}",
            "Access-Control-Expose-Headers": "X-Objects-Found, X-Detections, X-Confidence-Score, X-Processing-Time"
        }
        
        if detection_count > 0:
            # Annotate image with bounding boxes
            annotated = results[0].plot()
            annotated_rgb = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)
            annotated_image = Image.fromarray(annotated_rgb)
            
            # Convert to bytes
            img_byte_arr = io.BytesIO()
            annotated_image.save(img_byte_arr, format='PNG')
            img_byte_arr.seek(0)
            
            logger.info(
                f"Objects detected in {file.filename}: count={detection_count}, "
                f"max_confidence={max_confidence:.2f}, time={processing_time:.2f}s"
            )
            
            return StreamingResponse(
                img_byte_arr,
                media_type="image/png",
                headers=headers
            )
        else:
            logger.info(f"No objects detected in {file.filename}, time={processing_time:.2f}s")
            
            # Return original image
            return StreamingResponse(
                io.BytesIO(contents),
                media_type=file.content_type,
                headers=headers
            )
        
    except Exception as e:
        logger.error(f"Error processing {file.filename}: {str(e)}")
        raise HTTPException(500, f"Processing failed: {str(e)}")

@app.post("/detect-json")
async def detect_objects_json(
    file: UploadFile = File(...),
    confidence: float = Query(0.25, ge=0.0, le=1.0)
):
    """
    Detect objects with JSON response (for debugging)
    """
    start_time = datetime.now()
    
    try:
        # Validate file type
        if file.content_type not in ["image/jpeg", "image/png", "image/jpg"]:
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid file type. Use JPEG or PNG"}
            )
        
        # Read and process image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Run inference
        logger.info(f"Running detection (JSON) on {file.filename}")
        results = model.predict(
            source=image,
            conf=confidence,
            device=device,
            verbose=False
        )
        
        # Process results
        boxes = results[0].boxes
        detection_count = 0
        max_confidence = 0.0
        detections_list = []
        
        if boxes is not None and len(boxes) > 0:
            detection_count = len(boxes)
            confidences = boxes.conf.cpu().numpy()
            classes = boxes.cls.cpu().numpy()
            names = results[0].names
            
            for i in range(len(boxes)):
                box = boxes.xyxy[i].cpu().numpy()
                detections_list.append({
                    "class": names[int(classes[i])],
                    "confidence": float(confidences[i]),
                    "bbox": box.tolist()
                })
            
            max_confidence = float(confidences.max()) if len(confidences) > 0 else 0.0
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Also generate annotated image for base64
        if detection_count > 0:
            annotated = results[0].plot()
            annotated_rgb = cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB)
            annotated_image = Image.fromarray(annotated_rgb)
            img_byte_arr = io.BytesIO()
            annotated_image.save(img_byte_arr, format='PNG')
            img_base64 = base64.b64encode(img_byte_arr.getvalue()).decode('utf-8')
        else:
            img_base64 = base64.b64encode(contents).decode('utf-8')
        
        logger.info(
            f"JSON detection for {file.filename}: count={detection_count}, "
            f"time={processing_time:.2f}s"
        )
        
        return {
            "success": True,
            "objects_found": detection_count > 0,
            "detection_count": detection_count,
            "max_confidence": max_confidence,
            "processing_time": processing_time,
            "detections": detections_list,
            "filename": file.filename,
            "image_base64": f"data:image/png;base64,{img_base64}" if detection_count > 0 else f"data:{file.content_type};base64,{img_base64}"
        }
        
    except Exception as e:
        logger.error(f"Error in JSON detection: {str(e)}")
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "device": device,
        "cuda_available": torch.cuda.is_available(),
        "timestamp": datetime.now().isoformat(),
        "endpoints": [
            {"path": "/detect", "method": "POST", "desc": "Image detection"},
            {"path": "/detect-json", "method": "POST", "desc": "JSON detection"},
            {"path": "/health", "method": "GET", "desc": "Health check"}
        ]
    }

@app.get("/test-headers")
async def test_headers():
    """Test endpoint to check CORS headers"""
    response = JSONResponse(
        content={"message": "Test headers endpoint"},
        headers={
            "X-Test-Header-1": "value1",
            "X-Test-Header-2": "value2",
            "Access-Control-Expose-Headers": "X-Test-Header-1, X-Test-Header-2"
        }
    )
    return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

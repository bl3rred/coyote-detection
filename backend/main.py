from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from ultralytics import YOLO
from PIL import Image
import io
import logging
import torch
from datetime import datetime
import cv2
import numpy as np
import json

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
        except:
            logger.warning("best.pt not found, using yolov8n.pt")
            model = YOLO('yolov8n.pt')
            
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
        "model": "YOLOv8-nano",
        "device": device,
        "timestamp": datetime.now().isoformat()
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
        objects_found = False
        max_confidence = 0.0
        detection_count = 0
        detections_list = []
        
        if boxes is not None and len(boxes) > 0:
            detection_count = len(boxes)
            confidences = boxes.conf.cpu().numpy()
            classes = boxes.cls.cpu().numpy()
            
            # Get class names
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
            objects_found = True
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        if objects_found:
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
                headers={
                    "X-Objects-Found": "true",
                    "X-Detections": str(detection_count),  # Added this
                    "X-Confidence-Score": f"{max_confidence:.3f}",
                    "X-Processing-Time": f"{processing_time:.3f}",
                    "Access-Control-Expose-Headers": "*"  # Important for CORS
                }
            )
        else:
            logger.info(f"No objects detected in {file.filename}, time={processing_time:.2f}s")
            
            # Return a blank image or original image
            # Or you can return JSON instead
            return StreamingResponse(
                io.BytesIO(contents),  # Return original image
                media_type=file.content_type,
                headers={
                    "X-Objects-Found": "false",
                    "X-Detections": "0",
                    "X-Processing-Time": f"{processing_time:.3f}",
                    "Access-Control-Expose-Headers": "*"
                }
            )
        
    except Exception as e:
        logger.error(f"Error processing {file.filename}: {str(e)}")
        raise HTTPException(500, f"Processing failed: {str(e)}")

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "device": device,
        "cuda_available": torch.cuda.is_available(),
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

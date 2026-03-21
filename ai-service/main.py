from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pickle
import os
import numpy as np
from datetime import datetime

app = FastAPI(title="SmartGrid+ AI Service")

# Load models if they exist, otherwise train them first.
if not os.path.exists('models/regressor.pkl'):
    import model
    model.train_and_save_model()

with open('models/regressor.pkl', 'rb') as f:
    regressor = pickle.load(f)
    
with open('models/iso_forest.pkl', 'rb') as f:
    iso_forest = pickle.load(f)

class PredictRequest(BaseModel):
    meter_no: str
    current_usage: float
    historical_usage: float

def get_suggestion(usage_change_percent, is_anomaly):
    if is_anomaly:
        return "Critical: Extreme spike detected. Please check for power leaks or faulty high-drain appliances immediately."
    elif usage_change_percent > 20:
        return "Warning: Usage is significantly higher than usual. Consider optimizing AC usage and turning off idle devices."
    elif usage_change_percent > 0:
        return "Usage is slightly up. Swapping to LED lights or smart plugs can help reduce your bills further."
    else:
        return "Great job! Your usage is lower than your historical average. Keep up the good work!"

@app.post("/predict")
def predict_usage(req: PredictRequest):
    try:
        current_month = datetime.now().month
        # Assuming an average temperature for simplicity in real-time prediction
        avg_temp = 28.0 
        
        # Predict next month usage
        features = np.array([[current_month, avg_temp, req.historical_usage]])
        predicted = regressor.predict(features)[0]
        
        # Detect anomaly for current usage
        anomaly_score = iso_forest.predict([[req.current_usage]])[0] # Returns -1 for anomaly, 1 for normal
        is_anomaly = anomaly_score == -1
        
        # Calculate change
        change_percent = ((req.current_usage - req.historical_usage) / req.historical_usage) * 100 if req.historical_usage > 0 else 0
        
        return {
            "meter_no": req.meter_no,
            "predicted_units": round(predicted, 2),
            "anomaly_detected": bool(is_anomaly),
            "usage_trend_percent": round(change_percent, 2),
            "alert": "WARNING: Usage spike detected!" if is_anomaly else "Normal usage.",
            "suggestion": get_suggestion(change_percent, is_anomaly)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

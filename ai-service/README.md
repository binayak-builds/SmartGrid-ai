# SmartGrid+ AI Prediction Service

This microservice provides machine learning capabilities to predicting user electricity usage and detect anomalies using Scikit-Learn and FastAPI.

## Prerequisites
- Python 3.8+
- Scikit-learn
- FastAPI

## Setting up locally (Windows/Mac/Linux)

1. **Create Virtual Environment**
```bash
python -m venv venv
# On Windows
venv\Scripts\activate
# On Mac/Linux
source venv/bin/activate
```

2. **Install Dependencies**
```bash
pip install -r requirements.txt
```

3. **Train Models**
```bash
python model.py
```

4. **Run the AI Server**
```bash
python main.py
```
Or with uvicorn directly:
```bash
uvicorn main:app --reload
```

## API Testing
Once running, you can hit the `/predict` endpoint via POST:
`http://127.0.0.1:8000/predict`

```json
{
    "meter_no": "12344",
    "current_usage": 130,
    "historical_usage": 110
}
```

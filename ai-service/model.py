import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, IsolationForest
import pickle
import os

def get_model_path():
    # Vercel filesystem is read-only at runtime except for /tmp
    if os.environ.get('VERCEL') or os.environ.get('VERCEL_ENV'):
        return '/tmp/models'
    return os.path.join(os.getcwd(), 'models')

def train_and_save_model():
    # Simulate historical electricity usage data
    # Features: month (1-12), temperature (C), historical_usage (kWh)
    # Target: current_usage (kWh)
    
    np.random.seed(42)
    n_samples = 1000
    months = np.random.randint(1, 13, n_samples)
    temps = np.random.normal(25, 10, n_samples) # Avg 25C, SD 10
    historical = np.random.normal(150, 50, n_samples) # Avg 150kWh
    
    # Simulating consumption logic: Higher temp -> more AC -> higher usage
    # Higher historical usage usually implies a larger household -> higher usage
    current = historical * 0.8 + temps * 2.5 + np.random.normal(0, 10, n_samples)
    
    df = pd.DataFrame({
        'month': months,
        'temperature': temps,
        'historical_usage': historical,
        'current_usage': current
    })
    
    X = df[['month', 'temperature', 'historical_usage']]
    y = df['current_usage']
    
    # Train Usage Predictor (Random Forest)
    regressor = RandomForestRegressor(n_estimators=50, random_state=42)
    regressor.fit(X, y)
    
    # Train Anomaly Detector (Isolation Forest)
    # Detects sudden spikes in 'current_usage'
    iso_forest = IsolationForest(contamination=0.05, random_state=42)
    iso_forest.fit(df[['current_usage']])
    
    # Save the models
    model_dir = get_model_path()
    os.makedirs(model_dir, exist_ok=True)
    with open(os.path.join(model_dir, 'regressor.pkl'), 'wb') as f:
        pickle.dump(regressor, f)
        
    with open(os.path.join(model_dir, 'iso_forest.pkl'), 'wb') as f:
        pickle.dump(iso_forest, f)
        
    print(f"Models trained and saved to '{model_dir}' directory.")

if __name__ == "__main__":
    train_and_save_model()

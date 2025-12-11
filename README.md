# ShadowID---Absher-Tuwaiq


# DeepLearning & Classification Artifacts (ShadowID)

This folder contains the trained models and artifacts used by the **ShadowID Risk Engine**.

## Files

- `shadow_id_scaler.pkl`  
  StandardScaler fitted on the final feature set before feeding the deep model.

- `shadow_id_feature_names.json`  
  List of feature column names in the exact order expected as input `X`.

- `shadow_id_encoder.keras`  
  Keras encoder model that converts the scaled features into a 16-dimensional risk embedding.

- `shadow_id_risk_classifier_rf.pkl`  
  RandomForest risk classification model trained on the embeddings  
  (outputs: Low / Medium / High).

- `shadow_id_label_mapping.json`  
  Mapping between numeric labels (0/1/2) and text labels ("Low", "Medium", "High").

- `shadow_id_autoencoder.keras` *(optional)*  
  Full autoencoder model (encoder + decoder), used for research / retraining,  
  not required by the Flask API.

## Backend (Flask) – required files

For the Flask backend, you only need:

- `shadow_id_scaler.pkl`
- `shadow_id_feature_names.json`
- `shadow_id_encoder.keras`
- `shadow_id_risk_classifier_rf.pkl`
- `shadow_id_label_mapping.json`

import json
from datetime import datetime, date
import numpy as np


class EnhancedJSONEncoder(json.JSONEncoder):
    """
    JSON encoder that safely handles numpy datatypes, NaNs, infinities, and datetimes.
    """
    def default(self, obj):
        if isinstance(obj, (np.integer, np.int64, np.int32, np.int16, np.int8)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float64, np.float32, np.float16)):
            if np.isnan(obj) or np.isinf(obj):
                return None
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)


def safe_json_dumps(data: any, **kwargs) -> str:
    return json.dumps(data, cls=EnhancedJSONEncoder, **kwargs)


def sanitize_dict_for_json(data: dict) -> dict:
    """
    Recursively clean NaN and infinite values in a dictionary so it can be serialized without errors.
    """
    cleaned = {}
    for k, v in data.items():
        if isinstance(v, dict):
            cleaned[k] = sanitize_dict_for_json(v)
        elif isinstance(v, list):
            cleaned[k] = [
                sanitize_dict_for_json(item) if isinstance(item, dict)
                else (None if (isinstance(item, float) and (np.isnan(item) or np.isinf(item))) else item)
                for item in v
            ]
        elif isinstance(v, (float, np.floating)):
            cleaned[k] = None if (np.isnan(v) or np.isinf(v)) else float(v)
        elif isinstance(v, (int, np.integer)):
            cleaned[k] = int(v)
        else:
            cleaned[k] = v
    return cleaned

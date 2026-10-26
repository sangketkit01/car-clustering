from flask import Flask, render_template, request, jsonify
import joblib
import numpy as np
import os

# Resolve project assets from the current layout:
# server/app.py, server/model/*.joblib, templates/, and static/.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
app = Flask(
    __name__,
    template_folder=os.path.join(PROJECT_ROOT, "templates"),
    static_folder=os.path.join(PROJECT_ROOT, "static"),
)

# Load models once at startup
MODEL_DIR = os.path.join(BASE_DIR, "model")
scaler = joblib.load(os.path.join(MODEL_DIR, "car_scaler.joblib"))
kmeans = joblib.load(os.path.join(MODEL_DIR, "car_kmeans_model.joblib"))

# Cluster descriptions
CLUSTER_INFO = {
    0: {
        "name": "รถสปอร์ตพรีเมียม / รถสมรรถนะสูง",
        "name_en": "Premium Sports / High Performance",
        "icon": "🏎️",
        "description": "รถสมรรถนะสูง ให้ความเร็วและความตื่นเต้น เหมาะสำหรับผู้ที่ต้องการประสบการณ์การขับขี่ที่เหนือระดับ",
        "stats": {
            "avg_hp": "539 HP",
            "avg_price": "$215,462",
            "avg_torque": "663 Nm",
            "avg_speed": "288 km/h",
            "avg_battery": "3,602 Wh",
            "count": "235 รุ่น"
        },
        "color": "#1a1a2e"
    },
    1: {
        "name": "รถบ้าน / รถใช้งานทั่วไป",
        "name_en": "Everyday Family Car",
        "icon": "🚗",
        "description": "รถประหยัด ใช้งานประจำวัน เน้นความคุ้มค่าและความสะดวกสบาย เหมาะสำหรับทุกครอบครัว",
        "stats": {
            "avg_hp": "194 HP",
            "avg_price": "$34,843",
            "avg_torque": "302 Nm",
            "avg_speed": "196 km/h",
            "avg_battery": "1,762 Wh",
            "count": "783 รุ่น"
        },
        "color": "#2d5a27"
    },
    2: {
        "name": "Hypercar / รถระดับท็อปของโลก",
        "name_en": "Hypercar / World's Finest",
        "icon": "⚡",
        "description": "รถระดับท็อปของโลก สมรรถนะสูงสุด ราคาพรีเมียมสุดขีด สำหรับนักสะสมและผู้ชื่นชอบรถสุดพิเศษ",
        "stats": {
            "avg_hp": "1,405 HP",
            "avg_price": "$5,569,231",
            "avg_torque": "1,392 Nm",
            "avg_speed": "406 km/h",
            "avg_battery": "7,350 Wh",
            "count": "13 รุ่น"
        },
        "color": "#7c2d12"
    },
    3: {
        "name": "รถเฉพาะทาง / EV แรงบิดมหาศาล",
        "name_en": "Specialty / Extreme Torque EV",
        "icon": "💪",
        "description": "รถเฉพาะทางที่มีแรงบิดสูงผิดปกติ เหมาะสำหรับงานหนักและการใช้งานพิเศษ มักเป็นรถ Off-road หรือรถทางทหาร",
        "stats": {
            "avg_hp": "963 HP",
            "avg_price": "$120,133",
            "avg_torque": "14,658 Nm",
            "avg_speed": "209 km/h",
            "avg_battery": "200 Wh",
            "count": "6 รุ่น"
        },
        "color": "#1c1917"
    },
    4: {
        "name": "รถครอบครัวขนาดใหญ่ / SUV / รถตู้",
        "name_en": "Large Family / SUV / Van",
        "icon": "🚐",
        "description": "รถขนาดใหญ่ให้พื้นที่กว้างขวาง นั่งสบาย เหมาะสำหรับครอบครัวใหญ่ ผู้บริหาร หรือการเดินทางระยะไกล",
        "stats": {
            "avg_hp": "399 HP",
            "avg_price": "$95,277",
            "avg_torque": "665 Nm",
            "avg_speed": "200 km/h",
            "avg_battery": "5,411 Wh",
            "count": "177 รุ่น"
        },
        "color": "#1e3a5f"
    }
}


@app.route("/")
def index():
    return render_template("index.html", clusters=CLUSTER_INFO)


@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()

        # Extract and validate fields
        battery_capacity = float(data["battery_capacity"])
        horsepower = float(data["horsepower"])
        total_speed = float(data["total_speed"])
        zero_to_hundred = float(data["zero_to_hundred"])  # 0-100 seconds
        cars_prices = float(data["cars_prices"])
        seats = float(data["seats"])
        torque = float(data["torque"])

        # Convert 0-100 time to performance (1 / seconds)
        performance = 1.0 / zero_to_hundred

        # Build feature array in correct order
        features = np.array([[
            battery_capacity,
            horsepower,
            total_speed,
            performance,
            cars_prices,
            seats,
            torque
        ]])

        # Scale then predict
        features_scaled = scaler.transform(features)
        cluster = int(kmeans.predict(features_scaled)[0])

        cluster_data = CLUSTER_INFO[cluster]

        return jsonify({
            "success": True,
            "cluster": cluster,
            "name": cluster_data["name"],
            "name_en": cluster_data["name_en"],
            "icon": cluster_data["icon"],
            "description": cluster_data["description"],
            "stats": cluster_data["stats"],
            "color": cluster_data["color"],
            "performance": round(performance, 5)
        })

    except KeyError as e:
        return jsonify({"success": False, "error": f"Missing field: {str(e)}"}), 400
    except ZeroDivisionError:
        return jsonify({"success": False, "error": "0-100 time cannot be zero"}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5000)

import os
from flask import Flask, jsonify, request
from flask_cors import CORS
import mercadopago

app = Flask(__name__)

allowed_origins = {
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:8000",
    "http://localhost:8000",
}
custom_origins = os.getenv("CORS_ALLOWED_ORIGINS")
if custom_origins:
    for origin in custom_origins.split(","):
        origin = origin.strip()
        if origin:
            allowed_origins.add(origin)

CORS(app, resources={r"/*": {"origins": sorted(allowed_origins)}})

access_token = os.getenv("MERCADO_PAGO_ACCESS_TOKEN")
if not access_token:
    raise RuntimeError("MERCADO_PAGO_ACCESS_TOKEN não configurado. Defina a variável de ambiente antes de iniciar o servidor.")

sdk = mercadopago.SDK(access_token)

BASE_URL = os.getenv("APP_BASE_URL", "http://127.0.0.1:5500")


def parse_int(value):
    try:
        if isinstance(value, str):
            value = value.replace(".", "").replace(",", ".")
        parsed = int(float(value))
        return max(1, parsed)
    except Exception:
        return 1


def parse_float(value):
    try:
        if isinstance(value, str):
            value = value.replace(".", "").replace(",", ".")
        value = float(value)
        return max(0.01, value)
    except Exception:
        return 0.01


def sanitize_item(item):
    if not isinstance(item, dict):
        return None

    title = item.get("name") or item.get("nome") or "Produto Thémis"
    title = str(title).strip()[:120]
    quantity = parse_int(item.get("quantity", 1))
    unit_price = parse_float(item.get("price", 0))

    if not title or quantity <= 0 or unit_price <= 0:
        return None

    return {
        "title": title,
        "quantity": quantity,
        "unit_price": unit_price,
        "currency_id": "BRL",
    }


@app.route("/create_preference", methods=["POST"])
def create_preference():
    try:
        data = request.get_json(silent=True) or {}
        itens_cart = data.get("itensCart", [])
        if not isinstance(itens_cart, list) or not itens_cart:
            return jsonify({"status": "error", "message": "Carrinho vazio ou formato inválido."}), 400

        items = []
        for item in itens_cart:
            sanitized = sanitize_item(item)
            if sanitized is None:
                return jsonify({"status": "error", "message": "Item do carrinho inválido."}), 400
            items.append(sanitized)

        preference_data = {
            "items": items,
            "back_urls": {
                "success": f"{BASE_URL}/cart/cart.html?payment=success",
                "failure": f"{BASE_URL}/cart/cart.html?payment=error",
                "pending": f"{BASE_URL}/cart/cart.html?payment=pending",
            },
        }

        result = sdk.preference().create(preference_data)
        preference = result.get("response", {})

        if result.get("status") not in [200, 201]:
            error_msg = preference.get("message", "Erro desconhecido retornado pelo MP")
            return jsonify({"status": "error", "message": f"Mercado Pago: {error_msg}"}), 400

        return jsonify({
            "status": "success",
            "init_point": preference.get("init_point"),
            "sandbox_init_point": preference.get("sandbox_init_point"),
            "preference_id": preference.get("id"),
        }), 200

    except Exception as exc:
        app.logger.exception("Erro interno ao gerar preferencia MP")
        return jsonify({"status": "error", "message": "Erro interno ao gerar pagamento."}), 500


if __name__ == "__main__":
    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    host = os.getenv("FLASK_RUN_HOST", "127.0.0.1")
    port = int(os.getenv("FLASK_RUN_PORT", "5000"))

    print(f"Servidor Mercado Pago online em http://{host}:{port}")
    app.run(host=host, port=port, debug=debug_mode)

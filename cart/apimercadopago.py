from flask import Flask, request, jsonify
from flask_cors import CORS
import mercadopago
import os

# Inicializa o aplicativo servidor usando o framework Flask 
app = Flask(__name__)

# Ativa o CORS: Isso permite que navegadores e sites abertos localmente 
CORS(app)

# Aqui configuramos a chave secreta que abre as portas do Mercado Pago.
# Use uma variável de ambiente para segurança
access_token = os.getenv('MERCADO_PAGO_ACCESS_TOKEN', 'APP_USR-2038131907264049-040917-9954facb093322de58407758c8bc6eb0-3326778292')
sdk = mercadopago.SDK(access_token)

# Definimos uma "Rota", que é tipo um endereço de atendimento.
@app.route('/create_preference', methods=['POST'])
def create_preference():
    try:
        data = request.json
        itens_cart = data.get('itensCart', [])
        if not itens_cart:
            return jsonify({"status": "error", "message": "Carrinho vazio recebido."}), 400
        def parse_int(value):
            try:
                if isinstance(value, str):
                    value = value.replace(',', '.')
                return int(float(value))
            except Exception:
                return 1

        def parse_float(value):
            try:
                if isinstance(value, str):
                    value = value.replace('.', '').replace(',', '.')
                return float(value)
            except Exception:
                return 0.0

        items = []
        for item in itens_cart:
            items.append({
                "title": item.get('name', item.get('nome', 'Produto Thémis')),
                "quantity": parse_int(item.get('quantity', 1)),
                "unit_price": parse_float(item.get('price', 0)),
                "currency_id": "BRL"
            })
        preference_data = {
            "items": items,
            "back_urls": {
                "success": "http://localhost:5500/cart/cart.html?payment=success",
                "failure": "http://localhost:5500/cart/cart.html?payment=error",
                "pending": "http://localhost:5500/cart/cart.html?payment=pending"
            }
        }

        # A HORA DA VERDADE: O Python sai pela internet e cria a sessão nos servidores do Mercado Pago!
        result = sdk.preference().create(preference_data)
        preference = result.get("response", {})

        if result.get("status") not in [200, 201]:
            error_msg = preference.get("message", "Erro desconhecido retornado pelo MP")
            print("Mercado Pago Recusou:", error_msg)
            return jsonify({
                "status": "error",
                "message": f"Mercado Pago: {error_msg}"
            }), 400
        return jsonify({
            "status": "success",
            "init_point": preference.get("init_point"),
            "sandbox_init_point": preference.get("sandbox_init_point")
        }), 200

    # Se a própria Máquina do Python der tela azul/erro grave, avisamos graciosamente:
    except Exception as e:
        print("Erro interno geral ao gerar preferencia MP:", str(e))
        return jsonify({"status": "error", "message": str(e)}), 500

# Esta linha inicializa o Servidor Local quando você dá play nele.
if __name__ == '__main__':
    print("Servidor Mercado Pago online na Porta 5000!")
    print("Mantenha esta janela aberta e faça a compra no site.")
    # host 0.0.0.0 diz que ele escuta tanto comandos de '127.0.0.1' quanto de 'localhost'.
    app.run(host='0.0.0.0', port=5000, debug=True)


# linck çdo video de referencia https://www.youtube.com/watch?v=HNCjXGJxelI
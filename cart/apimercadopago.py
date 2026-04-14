from flask import Flask, request, jsonify
from flask_cors import CORS
import mercadopago

# Inicializa o aplicativo servidor usando o framework Flask (O Cérebro)
app = Flask(__name__)

# Ativa o CORS: Isso permite que navegadores e sites abertos localmente (como seu Live Server no http://127.0.0.1:5500) 
# consigam bater nesta porta 5000 sem que o site ache que é uma tentativa de invasão (Cross-Origin).
CORS(app)

# Aqui configuramos a chave secreta que abre as portas do Mercado Pago.
sdk = mercadopago.SDK("APP_USR-2038131907264049-040917-9954facb093322de58407758c8bc6eb0-3326778292")

# Definimos uma "Rota", que é tipo um endereço de atendimento.
@app.route('/create_preference', methods=['POST'])
def create_preference():
    try:
        # Pega a "caixa" (json) que o JavaScript mandou lá do Frontend
        data = request.json
        # Abre a caixa e tira de lá a lista de itens da compra (ou uma lista vazia se falhar)
        itens_cart = data.get('itensCart', [])
        
        # Trava de Segurança: Se chegar sem itens, não deixa criar a venda.
        if not itens_cart:
            return jsonify({"status": "error", "message": "Carrinho vazio recebido."}), 400

        # O Mercado Pago é exigente. Ele precisa que os itens sigam um 'molde' exato.
        # Vamos passar todos os itens de the Themisnot para o molde do Mercado Pago.
        items = []
        for item in itens_cart:
            items.append({
                # Título obrigatório (Pega 'name' se existir, senão 'nome', senão vira Produto Themis)
                "title": item.get('name', item.get('nome', 'Produto Thémis')),
                # A quantidade rigorosamente deve ser número inteiro
                "quantity": int(item.get('quantity', 1)),
                # O preço rigorosamente deve ser Float matemático decímal (ex: 200.00)
                "unit_price": float(item.get('price', 0)),
                # A Moeda (Currency). Se não declarar BRL, o Mercado Pago barra achando fraude.
                "currency_id": "BRL"
            })

        # 'preference_data' é a ficha completa do pedido que enviaremos.
        # Deixamos simples contendo apenas o pacote de itens. (Retiramos os links locais pra não travar)
        preference_data = {
            "items": items
        }

        # A HORA DA VERDADE: O Python sai pela internet e cria a sessão nos servidores do Mercado Pago!
        result = sdk.preference().create(preference_data)
        
        # Pega o que quer que o Mercado Pago devolveu
        preference = result.get("response", {})
        
        # Trava de Erro: Se o Mercado Pago não retornar Status '200' ou '201' (Selo de Sucesso),
        # Extraímos qual foi a resposta de "Bronca" e avisamos o Javascript para alertar a Tela.
        if result.get("status") not in [200, 201]:
            error_msg = preference.get("message", "Erro desconhecido retornado pelo MP")
            print("Mercado Pago Recusou:", error_msg)
            return jsonify({
                "status": "error",
                "message": f"Mercado Pago: {error_msg}"
            }), 400

        # Se passou direto pelas travas, a compra foi aprovada!
        # Devolvemos de volta pro JavaScript uma caixa verde ("success")
        # com os dois Links (init_point = Link Oficial / sandbox_init_point = Link Teste Faker)
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
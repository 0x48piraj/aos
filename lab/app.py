from flask import Flask, render_template

app = Flask(__name__)
app.config['SECRET_KEY'] = '0x48piraj'

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

@app.route('/mobile', methods=['GET'])
def mobile():
    return render_template('mobile.html')

if __name__ == "__main__":
    app.run("0.0.0.0", port=8080, debug=True, threaded=True)
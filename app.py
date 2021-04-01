from flask import Flask, render_template, url_for, request, redirect, session

import cv2
import numpy as np
import pandas as pd
from matplotlib import pyplot as plt

import json
import time

from utils import process_clustering_request

app = Flask(__name__)
app.secret_key = 'SECRET KEY'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/uploader', methods=['POST'])
def upload_file():

    # get img from request
    rawdata = request.files['file'].read()
    img = np.asarray(bytearray(rawdata), dtype="uint8")
    img = cv2.imdecode(img, cv2.IMREAD_COLOR)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # get algo name & params from request
    algo_name = request.form['algo_name']
    algo_params = request.form['algo_params'].split(',')
    algo_params = {k: float(v) for k, v in zip(algo_params[0::2], algo_params[1::2])}

    # main clustering wrapper
    output = process_clustering_request(img, algo_name, algo_params)
    json_output = json.dumps(output)

    return json_output

if __name__ == "__main__":

    app.config['SESSION_TYPE'] = 'filesystem'
    app.run(host='0.0.0.0', debug=True, use_reloader=False)
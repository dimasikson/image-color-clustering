from flask import Flask, render_template, url_for, request, redirect, session

import cv2
import numpy as np
import pandas as pd
from matplotlib import pyplot as plt

import json
import time

from utils import process_clustering_request, find_k, rawdata_to_img, return_params

app = Flask(__name__)
app.secret_key = 'SECRET KEY'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/submit', methods=['POST'])
def main_submit():

    # get img from request
    rawdata = request.files['file'].read()
    img = rawdata_to_img(rawdata)

    # get algo name & params from request
    algo_name, algo_params = return_params(request.form)

    # main clustering wrapper
    output = process_clustering_request(img, algo_name, algo_params)
    json_output = json.dumps(output)

    return json_output

@app.route('/find_k', methods=['POST'])
def main_find_k():

    # get img from request
    rawdata = request.files['file'].read()
    img = rawdata_to_img(rawdata)

    # main clustering wrapper
    output = find_k(img)
    json_output = json.dumps(output)

    return json_output

if __name__ == "__main__":

    app.config['SESSION_TYPE'] = 'filesystem'
    app.run(host='0.0.0.0', debug=True, use_reloader=False)
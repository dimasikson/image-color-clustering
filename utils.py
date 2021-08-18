import numpy as np
import pandas as pd

from sklearn.decomposition import PCA
from sklearn.cluster import KMeans, OPTICS
from hdbscan import HDBSCAN
from scipy.spatial import distance_matrix

import cv2
import base64

from datetime import datetime

from config import Config as cfg

def process_clustering_request(img, algo_name, algo_params):

    # params
    dim = cfg.dim
    out = {}

    # resize image according to dim scale, convert to df
    df = img_to_df(img)

    # clustering wrapper function, returns df with one more column 'cluster'
    if algo_name != "orig":
        df, _ = clustering_main(df.copy(), algo_name, algo_params) 
    else:
        df.loc[:, "cluster"] = 0

    # add PCA, for later ranking
    df = add_PCA(df.copy())

    # make json output
    out = df_to_json(df)
    
    return out

def find_k(img):

    # params
    dim = cfg.dim
    sample_frac = 0.2
    reg_aplha = 0.02
    k_min = 1
    k_max = 30
    ks = range(k_min, k_max+1)

    # resize image according to dim scale, convert to df, sample
    df = img_to_df(img).sample(frac=sample_frac)

    # initialize wcss with k=1 and store in dp
    _, kmeans_1 = clustering_main(df.copy(), "km", algo_params = {"n_clusters": 1})
    wcss_1 = kmeans_1.inertia_
    dp = {1: 1}
    
    # perform binary search for optimal k
    while True:

        # find middle k
        k_mid = (k_min + k_max) // 2

        # find middle k's in each half
        k_lo = (k_min + k_mid) // 2
        k_hi = (k_mid + k_max) // 2

        # find wcss for each k defined above, or retrieve from dp
        wcss_mid = dp[k_mid] if k_mid in dp else get_wcss_norm(df, k_mid, reg_aplha, wcss_1)
        wcss_lo = dp[k_lo] if k_lo in dp else get_wcss_norm(df, k_lo, reg_aplha, wcss_1)
        wcss_hi = dp[k_hi] if k_hi in dp else get_wcss_norm(df, k_hi, reg_aplha, wcss_1)

        # store in dp
        dp[k_mid] = wcss_mid
        dp[k_lo] = wcss_lo
        dp[k_hi] = wcss_hi

        # find lowest wcss from sampled k's
        wcss_min = np.argmin([wcss_lo, wcss_mid, wcss_hi])

        # reduce search space depending on the answer
        if wcss_min == 0: k_min, k_max = k_min, k_mid
        if wcss_min == 1: k_min, k_max = k_lo, k_hi
        if wcss_min == 2: k_min, k_max = k_mid, k_max
        
        # exit condition
        if k_max == k_min: break

    # check dp for lowest wcss. resulting k_min/k_max is not always the lowest wcss, but the lowest one is guaranteed to be in dp
    opt_k = min(dp, key=dp.get)

    return {"k": int(opt_k)}

def barray_to_img(barray):
    img = np.asarray(bytearray(barray), dtype="uint8")
    img = cv2.imdecode(img, cv2.IMREAD_COLOR)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    return img

def b64_to_img(b64):
    nparr = np.frombuffer(base64.b64decode(b64), np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
   
    return img

def return_params(form):
    algo_name = form['algo_name']
    algo_params = form['algo_params'].split(',')
    algo_params = {k: cfg.param_types[k](v) for k, v in zip(algo_params[0::2], algo_params[1::2])}

    return algo_name, algo_params


def df_to_json(df):

    out = {}

    for c in df.columns:
        out[c] = df.loc[:, c].to_list()

    return out

def resize_img_scale(img, dim):

    w, h, _ = img.shape
    area_scale = dim / ((w * h) ** 0.5)

    w = int( w * area_scale ) 
    h = int( h * area_scale )

    return cv2.resize(img, (h, w), interpolation = cv2.INTER_AREA)

def img_to_df(img):

    img = np.array(img)
    df = pd.DataFrame({
        'r': np.ravel(img[:,:,0]),
        'g': np.ravel(img[:,:,1]),
        'b': np.ravel(img[:,:,2]),
    })

    return df

def clustering_main(df, algo_name, algo_params, prune_hdb=-1):

    # standardizing RGB variables
    for c in 'rgb':
        df.loc[:, f'{c}_clust'] = ( df.loc[:, c] - df.loc[:, c].mean() ) / df.loc[:, c].std()
    
    # fill na in case standard deviation is 0
    df = df.fillna(0)

    # select algo
    if algo_name == 'km': clustClass = KMeans
    elif algo_name == 'hdb': clustClass = HDBSCAN
    elif algo_name == 'opt': clustClass = OPTICS
    else: raise Exception('Invalid algorithm name')

    # add optional parameter(s)
    if algo_name == 'km': algo_params["random_state"] = 42

    clust = clustClass(**algo_params)
    clust.fit(df.loc[:, ['r_clust', 'g_clust', 'b_clust']])
    df.loc[:, 'cluster'] = clust.labels_

    # prune hdb in case specified
    if prune_hdb >= 2:
        df = _prune_hdb(df.copy(), prune_hdb)

    return df, clust

def _prune_hdb(df, prune_hdb):

    # how many times to complete pruning
    n_clusters_orig = len(df.loc[df.loc[:,'cluster']>=0,'cluster'].unique())
    n_iter = max(0, n_clusters_orig - prune_hdb)

    for _ in range(n_iter):

        # find centroids
        df_hdb = df.loc[df.loc[:,'cluster']>=0,:].copy()
        means_hdb = df_hdb.groupby(['cluster']).mean().loc[:, ['r','g','b']]

        # distance matrix, shape (n_clusters, n_clusters)
        dist = pd.DataFrame(distance_matrix(means_hdb, means_hdb))
        dist.index = dist.columns = means_hdb.index

        # find 2 closest clusters
        dist = dist.unstack()
        dist = dist.loc[dist.index.get_level_values(0) < dist.index.get_level_values(1),:].sort_values()
        c1, c2 = dist.index.values[0]

        # merge 2 closest clusters
        df.loc[df.loc[:, 'cluster'] == c1, 'cluster'] = c2
    
    return df


def add_PCA(df):

    # perform PCA
    df.loc[:, 'PCA'] = PCA(
        n_components=1
    ).fit_transform(df.loc[:, ['r', 'g', 'b']])

    return df

def wcss_apply_reg(ss, alpha, k, epsilon=1e-4):
    return ss + alpha * ( ss + epsilon ) * (k**2)

def get_wcss_norm(df, k, alpha, wcss_1):
    _, kmeans = clustering_main(df, "km", algo_params = {"n_clusters": k})
    return wcss_apply_reg(kmeans.inertia_ / wcss_1, alpha, k)
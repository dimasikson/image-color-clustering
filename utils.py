import numpy as np
import pandas as pd

from sklearn.decomposition import PCA
from sklearn.cluster import KMeans, OPTICS
from hdbscan import HDBSCAN
from scipy.spatial import distance_matrix

import cv2

from datetime import datetime

def process_clustering_request(img, algo_name, algo_params):

    out = {}

    # params
    dim = 100

    # resize image according to dim scale, convert to df
    img = resize_img_scale(img, dim)
    df = img_to_df(img)

    # clustering wrapper function, returns df with one more column 'cluster'
    df = clustering_main(df.copy(), algo_name, algo_params)

    # add PCA, for later ranking
    df = add_PCA(df.copy())

    # make json output
    out = df_to_json(df)
    
    return out

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
 
    # KMeans
    if algo_name == 'km':
        km = KMeans(
            n_clusters=int(algo_params['n_clusters']),
        ).fit(df.loc[:, ['r_clust', 'g_clust', 'b_clust']])
        df.loc[:, 'cluster'] = km.labels_

    # HDBSCAN
    elif algo_name == 'hdb':
        hdb = HDBSCAN(
            min_cluster_size=int(algo_params['min_cluster_size']),
            min_samples=int(algo_params['min_samples']),
        ).fit(df.loc[:, ['r_clust', 'g_clust', 'b_clust']])
        df.loc[:, 'cluster'] = hdb.labels_

        # prune hdb in case specified
        if prune_hdb >= 2:
            df = _prune_hdb(df.copy(), prune_hdb)

    # OPTICS
    elif algo_name == 'opt':
        opt = OPTICS(
            min_samples=int(algo_params['min_samples']),
            max_eps=algo_params['max_eps'],
        ).fit(df.loc[:, ['r_clust', 'g_clust', 'b_clust']])
        df.loc[:, 'cluster'] = opt.labels_

    else:
        raise Exception('Invalid algorithm name')

    return df

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
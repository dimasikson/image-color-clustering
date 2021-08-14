# Image color clustering web app

### Link: https://image-color-clustering.azurewebsites.net/

## 1. What is this?

This is a web app that extracts a color palette of an image, by clustering its pixels' RGB values. Then it plots a colorbar, as well as a 3D representation of the clusters and their colors. Below is an example of how it would treat an image:

![](https://i.imgur.com/loarKeG.png)

## 2. How was it done?

### 2.1 Clustering

This web app offers 3 clustering algorithms:
- KMeans
- HDBSCAN
- OPTICS

#### 2.1.1 KMeans

KMeans is a flat distance-based partitioning algorithm, which partitions the data into a set number of clusters (the number of clusters needs to be pre-defined!). 

On the whole, it's the most stable algorithm for the task of determining color palettes, because of its pre-defined number of clusters. Below is an illustration of it's results on toy data:

![](https://www.vlfeat.org/demo/kmeans_2d_rand.jpg)

Source: https://www.vlfeat.org/overview/kmeans.html

#### 2.1.2 Suggesting the optimal K - Elbow method w/ regularization

The method for suggesting the optimal K is a tweak on the Elbow method. Below are values for the Elbow method (blue line), the Silhouette method (green line) and Elbow method + regularizatoin (orange line).

The normal Elbow method requires manual interpretation, and the Silhouette method is slow to compute. To find a minimum in the Elbow curve, we apply a small regularization parameter:

    alpha * wcss[k] * k^2

Below it's tested on the famous customer segmentation dataset which is often used to introduce people to clustering.

![image](https://user-images.githubusercontent.com/47122797/129456959-179f61f5-fcb9-4fb7-91e1-33e1185d37e0.png)

Source: https://www.kaggle.com/dimasikson/elbow-method-improved-regularization-added

#### 2.1.3 HDBSCAN

HDBSCAN is a hierarchical density-based clustering algorithm, which finds clusters in data of any shape. Overall, it produces highly interesting results, but it is unstable, it needs high amounts of hyperparameter tuning.

Its primary benefits are that it has the ability to ignore noise in the data. The below dataset is a canon illustration of that ability:

![](https://hdbscan.readthedocs.io/en/latest/_images/soft_clustering_explanation_6_0.png)

Source: https://hdbscan.readthedocs.io/en/latest/soft_clustering_explanation.html

#### 2.1.4 OPTICS

OPTICS is a flat density-based clustering algorithm, which also finds clusters in data of any shape. 

It's in ways more stable than HDBSCAN, but unfortunately it's slow with a capital S. It does also produce interesting results, and has the ability to ignore noise. Below is an illustration of how it works, but please visit the wiki link below for more details:

![](https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/OPTICS.svg/712px-OPTICS.svg.png)

Source: https://en.wikipedia.org/wiki/OPTICS_algorithm

### 2.2 Deployment

- REST API requests with the image and chosen parameters are sent to the server, which responds with cluster labels
- Backend is done in Flask
- Frontend is done with vanilla JS, HTML, CSS + plots done with Plotly
- Website hosted on Azure App Service with Docker

## 3. Why was it done?

Mainly for fun, but I also learned a lot about the underlying math behind various clustering algorithms. I also got the practice API requests from both sides, as well as Docker deployment on Azure.

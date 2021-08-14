# deployment instructions

To run locally:
    1. env\Scripts\activate
    2. python app.py

To deploy:
    Commit all changes (git add -> git commit -> git push)
    docker login {container_registry}
    docker build -t {container_registry}/{app_name}:latest .
    docker push {container_registry}/{app_name}:latest
    docker rmi --force $(docker images -f "dangling=true" -q)
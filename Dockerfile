FROM ubuntu:20.04

RUN apt-get update -y && apt-get install -y python3-pip python-dev

RUN DEBIAN_FRONTEND="noninteractive" apt-get install libgl1-mesa-glx -y
RUN DEBIAN_FRONTEND="noninteractive" apt-get install libglib2.0-0 -y
RUN DEBIAN_FRONTEND="noninteractive" apt-get install libsm6 -y
RUN DEBIAN_FRONTEND="noninteractive" apt-get install libxrender1 -y
RUN DEBIAN_FRONTEND="noninteractive" apt-get install libxext6 -y

COPY ./requirements.txt /app/requirements.txt

WORKDIR /app

RUN pip3 install --default-timeout=100 -r requirements.txt

COPY . /app

EXPOSE 5000

ENTRYPOINT [ "python3" ]

CMD [ "app.py" ]
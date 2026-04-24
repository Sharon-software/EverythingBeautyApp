set -o errexit

pip install -r SERVER/newproject/requirements.txt
python SERVER/newproject/manage.py collectstatic --noinput 
python SERVER/newproject/manage.py migrate

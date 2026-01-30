root := justfile_directory()
venv := root + "/.venv"
venv_bin := venv + "/bin"
python := venv_bin + "/python"
myst := venv_bin + "/myst"

venv:
    uv venv {{venv}}

python-deps: venv
    uv pip install mystmd --python {{python}}

docs: python-deps
    cd docs && {{myst}} build --html

docs-live: python-deps
    cd docs && {{myst}} start

node-deps:
    npm install

test: node-deps
    npm test

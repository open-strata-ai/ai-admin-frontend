REPO    := ai-admin-frontend
VERSION := 1.4.0

.PHONY: build test lint run generate

build:   ## compile
	npm run build

test:    ## run tests
	npm test

lint:    ## static analysis
	npm run lint

run:     ## run locally
	npm run dev

generate: ## render doc/code skeletons
	python3 ../openstrata-meta/template/generate_app_skeletons.py

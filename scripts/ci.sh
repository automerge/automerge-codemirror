#! /usr/bin/env bash
set -e
yarn prettier
yarn lint
yarn tsc
yarn cypress run --component --browser firefox

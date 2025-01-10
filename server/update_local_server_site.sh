#!/bin/bash
echo "Cleaning hexo..."
hexo clean

echo "Generating site..."
hexo generate

echo "Starting server..."
hexo server
#!/bin/bash

# Install 
if [ "$1" = "--install" ]; then
    
    # Validate
    echo "Checking prerequisites ..."
    
    # Validate: Npm must be installed
    if ! type "npm" > /dev/null; then
        >&2 echo "Error: NPM must be installed."
    else
        echo "Found NPM"
    fi
    
    # Install
    echo "Installing dev requirements ..."
    
    # Install: babel
    echo "Installing babel"
    npm install -g babel
    
# Watch
elif [ "$1" = "--watch" ]; then
    echo "Watching src for changes (outputs to /debug)..."
    babel --watch src/ --out-file debug/imgur-enhance.user.js

# Dist
elif [ "$1" = "--dist" ]; then
    echo "Building distribution (outputs to /dist)..."
    babel src/ --out-file dist/imgur-enhance.user.js
    
# Help
else
    echo "Help:"
    echo "  --install     Installs dev requirements"
    echo "  --watch       Watch the /src directory for changes and compile into /debug"
    echo "  --dist        Compile /src into /dist for distribution"
    echo ""
fi
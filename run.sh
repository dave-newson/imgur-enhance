#!/bin/bash

# Install 
if [ "$1" = "--install" ]; then
    
    # Validate
    echo "Checking requirements..."
    
    # Validate: Npm must be installed
    if ! type "npm" > /dev/null; then
        >&2 echo "Error: NPM must be installed."
    else
        echo "Found NPM"
    fi
    
    # Install
    echo "Installing requirements for dev..."
    
    # Install: babel
    echo "Installing babel"
    npm install -g babel
    
# Watch
elif [ "$1" = "--watch" ]; then
    echo "Wathing src..."
    babel --watch src/ --out-file dist/imgur-enhance.user.js

# Dist
elif [ "$1" = "--dist" ]; then
    echo "Building distribution..."
    babel src/ --out-file dist/imgur-enhance.user.js
    
# Help
else
    echo "Help:"
    echo "  --install     Installs requirements"
    echo "  --watch       Watch the /src/ directory for changes and compile into /dist"
    echo "  --dist        Compile /src into /dist"
    echo ""
fi

#
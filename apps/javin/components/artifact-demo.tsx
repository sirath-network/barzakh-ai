"use client";

import React from "react";
import { Button } from "./ui/button";
import { useArtifact } from "@/context/artifact-context";
import { generateUUID } from "@javin/shared/lib/utils/utils";

/**
 * Demo component to showcase the artifact system
 * Use this component in development to test different artifact types
 */
export function ArtifactDemo() {
  const { openArtifact } = useArtifact();

  const demos = [
    {
      title: "JavaScript Example",
      description: "Interactive JavaScript code with execution",
      onClick: () => {
        openArtifact({
          id: generateUUID(),
          type: "code",
          title: "Hello World Script",
          language: "javascript",
          content: `// Interactive JavaScript Example
console.log("Hello from the artifact viewer!");

// Try some calculations
const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((a, b) => a + b, 0);
console.log("Sum:", sum);

// Demonstrate objects
const user = {
  name: "Developer",
  role: "Testing Artifacts",
  timestamp: new Date().toISOString()
};
console.log("User:", user);

console.log("✨ Artifact system is working!");`,
          metadata: {
            fileName: "demo.js",
            lineCount: 17,
            isExecutable: true,
          },
        });
      },
    },
    {
      title: "HTML Preview",
      description: "Live HTML rendering in iframe",
      onClick: () => {
        openArtifact({
          id: generateUUID(),
          type: "html",
          title: "Interactive HTML Page",
          language: "html",
          content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Artifact Demo</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 600px;
            margin: 40px auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 30px;
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        h1 {
            margin: 0 0 10px 0;
            font-size: 2em;
        }
        button {
            background: white;
            color: #667eea;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            margin-top: 20px;
            transition: transform 0.2s;
        }
        button:hover {
            transform: scale(1.05);
        }
        .counter {
            font-size: 3em;
            font-weight: bold;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>🎨 Artifact Viewer Demo</h1>
        <p>This HTML is rendered live in the artifact panel!</p>
        <div class="counter" id="counter">0</div>
        <button onclick="incrementCounter()">Click Me!</button>
    </div>
    <script>
        let count = 0;
        function incrementCounter() {
            count++;
            document.getElementById('counter').textContent = count;
        }
    </script>
</body>
</html>`,
          metadata: {
            fileName: "demo.html",
            lineCount: 62,
            isExecutable: false,
          },
        });
      },
    },
    {
      title: "Python Script",
      description: "Syntax-highlighted Python code",
      onClick: () => {
        openArtifact({
          id: generateUUID(),
          type: "code",
          title: "Data Analysis Script",
          language: "python",
          content: `# Python Data Analysis Example
import pandas as pd
import numpy as np
from datetime import datetime

class DataAnalyzer:
    """Simple data analyzer for demonstrations"""
    
    def __init__(self, data):
        self.data = data
        self.results = {}
    
    def analyze(self):
        """Perform basic analysis"""
        self.results['mean'] = np.mean(self.data)
        self.results['median'] = np.median(self.data)
        self.results['std'] = np.std(self.data)
        return self.results
    
    def print_report(self):
        """Print analysis results"""
        print("=" * 40)
        print("Data Analysis Report")
        print(f"Timestamp: {datetime.now()}")
        print("=" * 40)
        for key, value in self.results.items():
            print(f"{key.capitalize()}: {value:.2f}")
        print("=" * 40)

# Example usage
data = [12, 45, 23, 67, 34, 89, 45, 23, 67, 12]
analyzer = DataAnalyzer(data)
analyzer.analyze()
analyzer.print_report()`,
          metadata: {
            fileName: "analyze.py",
            lineCount: 36,
            isExecutable: true,
          },
        });
      },
    },
    {
      title: "TypeScript Interface",
      description: "Type definitions and interfaces",
      onClick: () => {
        openArtifact({
          id: generateUUID(),
          type: "code",
          title: "User Types",
          language: "typescript",
          content: `// TypeScript Types and Interfaces

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

type UserRole = 'admin' | 'user' | 'guest';

interface ArtifactMetadata {
  fileName?: string;
  lineCount?: number;
  isExecutable?: boolean;
  language?: string;
}

interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  metadata?: ArtifactMetadata;
}

type ArtifactType = 
  | 'code' 
  | 'html' 
  | 'react' 
  | 'markdown' 
  | 'image';

// Example function using these types
function createArtifact(
  type: ArtifactType,
  content: string,
  metadata?: ArtifactMetadata
): Artifact {
  return {
    id: crypto.randomUUID(),
    type,
    title: metadata?.fileName || 'Untitled',
    content,
    metadata,
  };
}

// Usage
const myArtifact = createArtifact('code', 'console.log("Hello")', {
  fileName: 'example.js',
  lineCount: 1,
  isExecutable: true,
  language: 'javascript',
});`,
          metadata: {
            fileName: "types.ts",
            lineCount: 55,
            isExecutable: false,
          },
        });
      },
    },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">🎨 Artifact System Demo</h2>
        <p className="text-muted-foreground">
          Click any button below to open different types of artifacts in the viewer panel.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {demos.map((demo, index) => (
          <div
            key={index}
            className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold mb-1">{demo.title}</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {demo.description}
            </p>
            <Button onClick={demo.onClick} size="sm" className="w-full">
              Open in Artifact Viewer
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-muted/50 rounded-lg border">
        <h3 className="font-semibold mb-2">📚 Features to Test:</h3>
        <ul className="text-sm space-y-1 text-muted-foreground">
          <li>✅ Syntax highlighting with line numbers</li>
          <li>✅ Copy to clipboard functionality</li>
          <li>✅ Download as file</li>
          <li>✅ Run JavaScript code (try the JS example!)</li>
          <li>✅ Live HTML preview (try the HTML example!)</li>
          <li>✅ Fullscreen mode toggle</li>
          <li>✅ Smooth slide-in/out animations</li>
          <li>✅ Mobile-responsive design</li>
        </ul>
      </div>
    </div>
  );
}


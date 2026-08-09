import os
import sys

# Add root backend directory to sys.path so modules import correctly on Vercel
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

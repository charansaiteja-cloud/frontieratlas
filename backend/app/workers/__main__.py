"""Entry point for pipeline worker."""
import asyncio

from app.workers import main

if __name__ == "__main__":
    asyncio.run(main())
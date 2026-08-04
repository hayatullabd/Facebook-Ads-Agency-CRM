from typing import Any

from fastapi.responses import JSONResponse


def success(data: Any = None, message: str = "Success", status_code: int = 200) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"statusCode": status_code, "data": data, "message": message, "success": True},
    )


class ApiError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(message)

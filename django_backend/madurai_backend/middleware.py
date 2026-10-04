class SimpleCorsMiddleware:
    """
    Lightweight middleware to add CORS headers to all HTTP responses,
    allowing the frontend (e.g. running on file:// or local dev server)
    to query Django APIs without cross-origin blocks.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "OPTIONS":
            from django.http import HttpResponse
            response = HttpResponse(status=200)
            response["Access-Control-Allow-Origin"] = "*"
            response["Access-Control-Allow-Headers"] = "*"
            response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            return response

        response = self.get_response(request)
        response["Access-Control-Allow-Origin"] = "*"
        response["Access-Control-Allow-Headers"] = "*"
        response["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        return response

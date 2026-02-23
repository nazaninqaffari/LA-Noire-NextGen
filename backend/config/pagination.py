from rest_framework.pagination import PageNumberPagination


class FlexiblePageNumberPagination(PageNumberPagination):
    """Allow clients to override page size via ?page_size=N (max 200)."""
    page_size_query_param = 'page_size'
    max_page_size = 200

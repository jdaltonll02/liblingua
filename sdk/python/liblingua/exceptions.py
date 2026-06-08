class LiblinguaError(Exception):
    """Base exception for all liblingua errors."""


class AuthenticationError(LiblinguaError):
    """Raised when the API key is missing, invalid, or revoked."""


class DatasetNotFoundError(LiblinguaError):
    """Raised when the requested language does not exist."""


class DatasetNotPublishedError(LiblinguaError):
    """Raised when the dataset exists but has not been published yet."""


class RateLimitError(LiblinguaError):
    """Raised when the API rate limit is exceeded."""

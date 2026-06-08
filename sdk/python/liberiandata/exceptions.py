class LiberianDataError(Exception):
    """Base exception for all liberiandata errors."""


class AuthenticationError(LiberianDataError):
    """Raised when the API key is missing, invalid, or revoked."""


class DatasetNotFoundError(LiberianDataError):
    """Raised when the requested language does not exist."""


class DatasetNotPublishedError(LiberianDataError):
    """Raised when the dataset exists but has not been published yet."""


class RateLimitError(LiberianDataError):
    """Raised when the API rate limit is exceeded."""

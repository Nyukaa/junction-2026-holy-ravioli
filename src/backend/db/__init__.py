from config import DB_BACKEND

from .base import Repo


def make_repo() -> Repo:
    if DB_BACKEND == "pg":
        from .pg import PgRepo

        return PgRepo()
    from .fake import FakeRepo

    return FakeRepo()


repo: Repo = make_repo()

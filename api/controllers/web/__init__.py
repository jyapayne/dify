from flask import Blueprint
from flask_restx import Namespace

from libs.external_api import ExternalApi

bp = Blueprint("web", __name__, url_prefix="/api")

api = ExternalApi(
    bp,
    version="1.0",
    title="Web API",
    description="Public APIs for web applications including file uploads, chat interactions, and app management",
)

# Create namespace
web_ns = Namespace("web", description="Web application API operations", path="/")

from . import (
    app,
    audio,
    challenges,
    completion,
    conversation,
    feature,
    files,
    forgot_password,
    login,
    message,
    passport,
    red_blue_challenges,
    register,
    remote_files,
    saved_message,
    site,
    workflow,
)

api.add_namespace(web_ns)

__all__ = [
    "api",
    "app",
    "audio",
    "bp",
    "challenges",
    "completion",
    "conversation",
    "feature",
    "files",
    "forgot_password",
    "login",
    "message",
    "passport",
    "red_blue_challenges",
    "register",
    "remote_files",
    "saved_message",
    "site",
    "web_ns",
    "workflow",
]

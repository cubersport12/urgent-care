"""S3/MinIO client for media uploads."""
from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any

import boto3
import structlog
from botocore.config import Config as BotoConfig
from botocore.exceptions import ClientError

from app.core.config import settings

log = structlog.get_logger()


class S3Client:
    def __init__(
        self,
        *,
        endpoint: str,
        access_key: str,
        secret_key: str,
        bucket: str,
        region: str = "us-east-1",
    ) -> None:
        self.bucket = bucket
        self._client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
            config=BotoConfig(signature_version="s3v4"),
        )

    async def ensure_bucket(self) -> None:
        try:
            self._client.head_bucket(Bucket=self.bucket)
        except ClientError as e:
            error_code = e.response["Error"]["Code"]
            if error_code in ("404", "NoSuchBucket", "NotFound"):
                log.info("creating_bucket", bucket=self.bucket)
                self._client.create_bucket(Bucket=self.bucket)
            else:
                raise

    async def ensure_public_read_policy(self) -> None:
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": ["*"]},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{self.bucket}/*"],
                }
            ],
        }

        def _apply() -> None:
            self._client.put_bucket_policy(
                Bucket=self.bucket,
                Policy=json.dumps(policy),
            )

        await asyncio.to_thread(_apply)
        log.info("bucket_public_read_policy_applied", bucket=self.bucket)

    async def object_exists(self, *, key: str) -> bool:
        def _head() -> bool:
            try:
                self._client.head_object(Bucket=self.bucket, Key=key)
                return True
            except ClientError:
                return False

        return await asyncio.to_thread(_head)

    async def list_keys(self, *, prefix: str = "") -> list[str]:
        def _list() -> list[str]:
            keys: list[str] = []
            paginator = self._client.get_paginator("list_objects_v2")
            for page in paginator.paginate(Bucket=self.bucket, Prefix=prefix):
                for obj in page.get("Contents") or []:
                    keys.append(obj["Key"])
            return keys

        return await asyncio.to_thread(_list)

    async def get_object(self, *, key: str) -> tuple[bytes, str]:
        def _get() -> tuple[bytes, str]:
            resp = self._client.get_object(Bucket=self.bucket, Key=key)
            body = resp["Body"].read()
            content_type = resp.get("ContentType") or "application/octet-stream"
            return body, content_type

        return await asyncio.to_thread(_get)

    async def upload_bytes(
        self,
        *,
        data: bytes,
        key: str,
        content_type: str = "application/octet-stream",
        public: bool = True,
    ) -> str:
        put_kwargs: dict[str, Any] = {
            "Bucket": self.bucket,
            "Key": key,
            "Body": data,
            "ContentType": content_type,
        }
        if public:
            put_kwargs["ACL"] = "public-read"

        def _do_upload() -> None:
            try:
                self._client.put_object(**put_kwargs)
            except ClientError as exc:
                if exc.response["Error"].get("Code") == "AccessControlListNotSupported":
                    put_kwargs.pop("ACL", None)
                    self._client.put_object(**put_kwargs)
                else:
                    raise

        await asyncio.to_thread(_do_upload)
        return f"{settings.s3_endpoint}/{self.bucket}/{key}"

    async def delete_file(self, *, key: str) -> bool:
        try:
            await asyncio.to_thread(
                self._client.delete_object, Bucket=self.bucket, Key=key
            )
            return True
        except ClientError as e:
            log.error("s3_delete_failed", key=key, error=str(e))
            return False


def get_s3_client() -> S3Client:
    return S3Client(
        endpoint=settings.s3_endpoint,
        access_key=settings.s3_access_key,
        secret_key=settings.s3_secret_key,
        bucket=settings.s3_bucket_media,
        region=settings.s3_region,
    )

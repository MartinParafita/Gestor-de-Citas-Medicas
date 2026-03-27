import os
import cloudinary
import cloudinary.uploader

cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
)


def upload_file(file, folder, **kwargs):
    """Sube un archivo a Cloudinary. Retorna el resultado del upload."""
    resource_type = kwargs.pop("resource_type", "auto")
    return cloudinary.uploader.upload(
        file,
        folder=folder,
        resource_type=resource_type,
        **kwargs,
    )


def destroy_file(public_id):
    """Elimina un archivo de Cloudinary por su public_id."""
    # Intentamos en ambos tipos habituales para soportar imágenes y PDFs/raw.
    for resource_type in ("image", "raw"):
        try:
            result = cloudinary.uploader.destroy(
                public_id,
                resource_type=resource_type,
                invalidate=True,
            )
            if result.get("result") in ("ok", "not found"):
                return result
        except Exception:
            continue

    return {"result": "error"}

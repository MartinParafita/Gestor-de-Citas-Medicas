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
    return cloudinary.uploader.upload(
        file,
        folder=folder,
        resource_type="auto",
        **kwargs,
    )


def destroy_file(public_id):
    """Elimina un archivo de Cloudinary por su public_id."""
    try:
        cloudinary.uploader.destroy(public_id)
    except Exception as e:
        print(f"[CLOUDINARY] Error al eliminar {public_id}: {e}")

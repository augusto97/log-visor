<?php
session_start();

header('Content-Type: application/json');

$response = [
    'success' => false,
    'message' => '',
    'file' => null
];

try {
    if (!isset($_FILES['logfile']) || $_FILES['logfile']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('No se recibió ningún archivo o hubo un error en la subida');
    }

    $file = $_FILES['logfile'];
    $allowedExtensions = ['log', 'txt'];
    $maxFileSize = 50 * 1024 * 1024; // 50MB

    // Validate file extension
    $fileName = $file['name'];
    $fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

    if (!in_array($fileExtension, $allowedExtensions)) {
        throw new Exception('Solo se permiten archivos .log o .txt');
    }

    // Validate file size
    if ($file['size'] > $maxFileSize) {
        throw new Exception('El archivo es demasiado grande. Máximo 50MB');
    }

    // Validate file content (text file)
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, ['text/plain', 'text/x-log', 'application/octet-stream'])) {
        // Be lenient with mime type, but check if it's readable as text
        $sample = file_get_contents($file['tmp_name'], false, null, 0, 1024);
        if (!mb_check_encoding($sample, 'UTF-8') && !mb_check_encoding($sample, 'ASCII')) {
            throw new Exception('El archivo no parece ser un archivo de texto válido');
        }
    }

    // Create uploads directory if it doesn't exist
    $uploadsDir = __DIR__ . '/uploads';
    if (!is_dir($uploadsDir)) {
        mkdir($uploadsDir, 0755, true);
    }

    // Generate unique filename
    $uniqueName = uniqid('log_', true) . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $fileName);
    $destination = $uploadsDir . '/' . $uniqueName;

    // Move uploaded file
    if (!move_uploaded_file($file['tmp_name'], $destination)) {
        throw new Exception('Error al guardar el archivo');
    }

    // Store in session
    $_SESSION['current_log'] = $uniqueName;
    $_SESSION['original_name'] = $fileName;

    $response['success'] = true;
    $response['message'] = 'Archivo subido correctamente';
    $response['file'] = [
        'name' => $uniqueName,
        'original_name' => $fileName,
        'size' => $file['size']
    ];

} catch (Exception $e) {
    $response['message'] = $e->getMessage();
}

echo json_encode($response);

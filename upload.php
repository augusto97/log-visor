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
    $maxFileSize = 50 * 1024 * 1024; // 50MB
    $fileName = $file['name'];

    // Validate file size
    if ($file['size'] > $maxFileSize) {
        throw new Exception('El archivo es demasiado grande. Máximo 50MB');
    }

    // Validate that it's a text file by checking content
    $sample = file_get_contents($file['tmp_name'], false, null, 0, 8192);

    // Check if file is empty
    if (empty($sample)) {
        throw new Exception('El archivo está vacío');
    }

    // Check for binary content (null bytes, non-printable characters)
    // Allow newlines, tabs, carriage returns and printable ASCII/UTF-8
    $binaryCheck = preg_match('/[\x00-\x08\x0B-\x0C\x0E-\x1F]/', $sample);

    if ($binaryCheck) {
        throw new Exception('El archivo parece ser binario. Solo se aceptan archivos de texto plano');
    }

    // Additional validation: check if it's valid UTF-8 or ASCII
    if (!mb_check_encoding($sample, 'UTF-8') && !mb_check_encoding($sample, 'ASCII')) {
        throw new Exception('El archivo no tiene una codificación de texto válida (UTF-8 o ASCII)');
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

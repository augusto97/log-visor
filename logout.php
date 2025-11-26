<?php
require_once 'config.php';

initSecureSession();

logout();

header('Location: login.php');
exit;

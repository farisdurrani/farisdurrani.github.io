<?php

  $to = "yourname@yourwebsite.com";

  $headers = "From: email_from \r\n";

  $headers .= "Reply-To: visitor_email \r\n";

  $email_body

  mail($to,"test 1 subject","test 1",$headers);

 ?>
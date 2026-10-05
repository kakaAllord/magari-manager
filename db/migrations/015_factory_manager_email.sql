-- The company's factory manager signs in as factorymanager@zuraja.com instead of the address 013
-- gave them. Only the email changes: their password, open sessions and history stay as they are.
UPDATE users SET email = 'factorymanager@zuraja.com'
 WHERE email = 'factory.manager@zuraja.com' AND role = 'factory_manager'
   AND NOT EXISTS (SELECT 1 FROM users WHERE email = 'factorymanager@zuraja.com');

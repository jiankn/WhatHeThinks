-- 付款后发邮件用的第二个访问 token（服务器只存哈希，原始 token 只出现在邮件链接里）。
ALTER TABLE reports ADD COLUMN alt_token_hash TEXT;

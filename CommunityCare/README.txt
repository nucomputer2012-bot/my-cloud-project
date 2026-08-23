Community Care - Cloudflare Pages + Google Apps Script

โครงสร้างไฟล์ที่ต้องอยู่ใน root ของ repository:
index.html
functions/api/cloud.js

Deploy:
1. อัปโหลดไฟล์ทั้งหมดขึ้น GitHub repository เดียวกัน
2. ให้ Cloudflare Pages เชื่อม repository นี้
3. Build command: เว้นว่าง
4. Build output directory: /
5. Deploy ใหม่จาก branch main
6. ทดสอบ https://<โดเมนของคุณ>/api/cloud
   ต้องไม่แสดงหน้า index.html

หมายเหตุ:
- cloud.js เป็น Pages Function แบบ onRequest รองรับ GET/POST/OPTIONS
- getAll จะถูกส่งต่อไป Apps Script ด้วย GET
- saveAll / saveAuth / verifyAuth / requestPasswordReset / resetPassword ถูกส่งต่อด้วย POST
- HTML v18 เก็บระบบ Email/Password Login ไว้
- รายชื่อชุมชนเดิมจะถูกใช้เป็นหลักเมื่ออ่าน settings.communities จากฐานข้อมูลเดิม

Community Care — Cloudflare Pages Advanced Mode

โครงสร้าง:
  index.html
  _worker.js

เหตุผล:
  ตอนนี้ /api/cloud เดิมเปิดหน้า Community Care แปลว่า Pages ยังไม่ได้รัน
  Functions route. ชุดนี้ใช้ Cloudflare Pages Advanced Mode (_worker.js)
  เพื่อบังคับให้ /api/cloud เป็น API ก่อน แล้วค่อยให้เส้นทางอื่นแสดงเว็บไซต์

วิธีติดตั้ง:
1. แตก ZIP นี้
2. นำ index.html และ _worker.js ขึ้น GitHub ใน branch main
3. Cloudflare Pages > community-care > Settings > Builds & deployments
4. ให้ Build output directory ชี้ไปยังโฟลเดอร์ที่มี index.html และ _worker.js
   (ถ้าโปรเจกต์อยู่ root ให้ใช้ root/output ที่ deploy index.html)
5. Deploy main ใหม่
6. เปิด:
   https://community-care.pages.dev/api/cloud
   ต้องเห็น JSON ประมาณ:
   {"ok":true,"service":"Community Care Cloud Proxy","status":"running",...}
   ห้ามเห็นหน้า Community Care

หมายเหตุ:
- _worker.js จะเป็น Advanced Mode และจะไม่ใช้โฟลเดอร์ functions/
- ไม่ต้องใส่ Google Apps Script URL ไว้ใน Cloudflare
- URL ของ Google Apps Script ยังใส่ในหน้าตั้งค่าของ Community Care ตามเดิม
- ระบบ Login Email/Password และการตั้งค่าชุมชนอยู่ใน index.html รุ่น v18 เดิม

# ใช้ Node.js เป็น base image
FROM node:18-alpine

# กำหนดโฟลเดอร์ทำงานภายใน container
WORKDIR /app

# คัดลอก package.json และ package-lock.json
COPY package*.json ./

# ติดตั้ง dependencies
RUN npm install

# คัดลอกซอร์สโค้ดทั้งหมด
COPY . .

# เปิดพอร์ต 5001 สำหรับ Backend
EXPOSE 5001

# รัน Backend (ใช้ node server.js สำหรับ production)
CMD ["npm", "start"]

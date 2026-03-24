# ใช้ Node.js เป็น base image
FROM node:20-alpine

# กำหนดโฟลเดอร์ทำงานภายใน container
WORKDIR /app

# คัดลอก package.json และ package-lock.json
COPY package*.json ./

# ติดตั้ง dependencies
RUN npm install

# คัดลอกซอร์สโค้ดทั้งหมด (ยกเว้น node_modules แนะนำให้ใช้ .dockerignore)
COPY . .

# เปิดพอร์ต 5173 สำหรับ Vite
EXPOSE 5173

# รัน Frontend (ใช้ vite --host เพื่อให้เข้าถึงได้จากภายนอก container)
CMD ["npm", "run", "dev", "--", "--host"]

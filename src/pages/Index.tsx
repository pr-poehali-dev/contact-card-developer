import ContactCard from "@/components/ContactCard";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-600 p-4">
      <ContactCard 
        name="Иванов Иван"
        position="Старший разработчик"
        email="ivanov@example.com"
        phone="+7 (123) 456-78-90"
        address="г. Москва, ул. Примерная, д. 123"
        avatarUrl="/placeholder.svg"
      />
    </div>
  );
};

export default Index;

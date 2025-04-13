import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mail, Phone, MapPin } from "lucide-react";

interface ContactCardProps {
  name: string;
  position: string;
  email: string;
  phone: string;
  address: string;
  avatarUrl?: string;
}

const ContactCard: React.FC<ContactCardProps> = ({
  name,
  position,
  email,
  phone,
  address,
  avatarUrl,
}) => {
  // Получаем инициалы для аватара
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="flex flex-col items-center pb-2">
        <Avatar className="h-24 w-24 mb-4">
          <AvatarImage src={avatarUrl || "/placeholder.svg"} alt={name} />
          <AvatarFallback className="text-lg bg-primary text-primary-foreground">
            {getInitials(name)}
          </AvatarFallback>
        </Avatar>
        <CardTitle className="text-2xl font-bold text-center">{name}</CardTitle>
        <p className="text-muted-foreground text-center">{position}</p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <ContactItem icon={<Mail className="h-5 w-5" />} label="Email">
            <a href={`mailto:${email}`} className="text-blue-600 hover:underline">
              {email}
            </a>
          </ContactItem>

          <ContactItem icon={<Phone className="h-5 w-5" />} label="Телефон">
            <a href={`tel:${phone}`} className="text-blue-600 hover:underline">
              {phone}
            </a>
          </ContactItem>

          <ContactItem icon={<MapPin className="h-5 w-5" />} label="Адрес">
            {address}
          </ContactItem>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-4">
          <Button variant="outline" onClick={() => window.location.href = `tel:${phone}`}>
            Позвонить
          </Button>
          <Button onClick={() => window.location.href = `mailto:${email}`}>
            Написать
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface ContactItemProps {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}

const ContactItem: React.FC<ContactItemProps> = ({ icon, label, children }) => {
  return (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 text-muted-foreground mt-0.5">{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground mb-0.5">{label}</p>
        <div className="text-sm font-medium">{children}</div>
      </div>
    </div>
  );
};

export default ContactCard;

import { 
  FaServer, FaShieldAlt, FaArrowRight, FaBoxOpen, 
  FaCode, FaDatabase, FaTable, FaCubes 
} from "react-icons/fa";
import { Link } from "react-router-dom";

export default function Home() {
  const services = [
    {
      name: "EC2 Instances",
      path: "/instances",
      description: "Manage virtual servers across all AWS regions.",
      icon: <FaServer />,
      color: "blue",
    },
    {
      name: "S3 Buckets",
      path: "/s3",
      description: "Object storage for backups and static assets.",
      icon: <FaBoxOpen />,
      color: "orange",
    },
    {
      name: "Lambda Functions",
      path: "/lambda",
      description: "Serverless code execution and event triggers.",
      icon: <FaCode />,
      color: "yellow",
    },
    {
      name: "IAM Users",
      path: "/iam",
      description: "Identity and access management control center.",
      icon: <FaShieldAlt />,
      color: "red",
    },
    {
      name: "DynamoDB",
      path: "/dynamodb",
      description: "Fast, flexible NoSQL database tables.",
      icon: <FaTable />,
      color: "blue",
    },
    {
      name: "RDS Instances",
      path: "/rds",
      description: "Managed relational database services.",
      icon: <FaDatabase />,
      color: "blue",
    },
    {
      name: "EKS Clusters",
      path: "/eks",
      description: "Managed Kubernetes container clusters.",
      icon: <FaCubes />,
      color: "orange",
    }
  ];

  return (
    <div className="pt-24 pb-12 px-6 min-h-screen bg-gray-50 flex flex-col items-center">
      {/* Hero Section */}
      <div className="text-center max-w-2xl mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-tight">
          Cloud <span className="text-blue-600">Command</span>
        </h1>
        <p className="text-gray-500 mt-4 text-lg">
          Select a service to view multi-region resource snapshots.
        </p>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-6xl">
        {services.map((service) => (
          <Link
            key={service.name}
            to={service.path}
            className="group p-6 bg-white rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-blue-400 transition-all duration-300 relative overflow-hidden flex flex-col justify-between"
          >
            {/* Background Icon Decoration */}
            <div className="absolute -top-2 -right-2 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity text-8xl">
              {service.icon}
            </div>

            <div>
              <div className={`inline-flex p-3 rounded-xl mb-4 bg-gray-50 text-gray-700 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300 shadow-sm`}>
                <span className="text-xl">{service.icon}</span>
              </div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">{service.name}</h2>
              <p className="text-gray-500 text-xs leading-relaxed mb-6">
                {service.description}
              </p>
            </div>

            <div className="flex items-center text-blue-600 font-bold text-[10px] uppercase tracking-wider">
              Explore <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>

      {/* Infrastructure Note */}
      <div className="mt-16 flex flex-col items-center opacity-40">
        <div className="h-[1px] w-24 bg-gray-400 mb-4"></div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">
          Terraform Managed • Multi-Region
        </p>
      </div>
    </div>
  );
}
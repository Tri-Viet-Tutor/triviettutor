import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

const registerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

/**
 * RegisterPage
 *
 * Self-registration for students/parents (BR-01.04).
 * Admin and tutor accounts are created by the admin.
 */
export function RegisterPage() {
  const navigate = useNavigate();

  const { mutate: register, isPending, error } = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post("/auth/register", data);
      return response.data;
    },
  });

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  function onSubmit(data: RegisterFormValues) {
    register(
      { email: data.email, password: data.password, fullName: data.fullName },
      { onSuccess: () => navigate("/student/catalog") }
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Create an account</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
          <input
            id="fullName"
            type="text"
            {...formRegister("fullName")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName.message}</p>}
        </div>

        <div>
          <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            id="reg-email"
            type="email"
            {...formRegister("email")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            id="reg-password"
            type="password"
            {...formRegister("password")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
          <input
            id="confirmPassword"
            type="password"
            {...formRegister("confirmPassword")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>}
        </div>

        {error && <p className="text-sm text-red-600">Registration failed. The email may already be in use.</p>}

        <button
          id="register-submit"
          type="submit"
          disabled={isPending}
          className="w-full py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {isPending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link to="/login" className="text-primary-600 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}

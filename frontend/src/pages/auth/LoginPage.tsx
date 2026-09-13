import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * LoginPage
 *
 * Handles user login and redirects to the appropriate dashboard
 * based on the user's role (BR-01).
 */
export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { mutate: login, isPending, error } = useMutation({
    mutationFn: async (data: LoginFormValues) => {
      const response = await api.post("/auth/login", data);
      return response.data;
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  function onSubmit(data: LoginFormValues) {
    login(data, {
      onSuccess: (response: any) => {
        setAuth(response.data.token, response.data.user);
        // Redirect to the correct dashboard based on role
        switch (response.data.user.role) {
          case "ROLE_ADMIN":
            navigate("/admin/courses");
            break;
          case "ROLE_TUTOR":
            navigate("/tutor/sessions");
            break;
          case "ROLE_STUDENT":
            navigate("/student/catalog");
            break;
        }
      },
    });
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Sign in</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register("email")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="you@example.com"
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register("password")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="••••••••"
          />
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
        </div>

        {error && (
          <p className="text-sm text-red-600">
            Invalid email or password. Please try again.
          </p>
        )}

        <button
          id="login-submit"
          type="submit"
          disabled={isPending}
          className="w-full py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        New student?{" "}
        <Link to="/register" className="text-primary-600 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
